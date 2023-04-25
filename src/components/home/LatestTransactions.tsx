import { ArrowRightIcon, ArrowsRightLeftIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';

import type { DataAvailabilityTransactionUnion, DaTransactionsQuery, Profile } from '@/generated';
import { useDaTransactionsQuery } from '@/generated';
import { useAppPersistStore, useAppStore } from '@/store/app';
import { getRelativeTime } from '@/utils/formatTime';
import getConfig from '@/utils/getConfig';
import getDAActionType from '@/utils/getDAActionType';
import getLensterLink from '@/utils/getLensterLink';
import getProfilePicture from '@/utils/getProfilePicture';

import Favorite from '../shared/Favorite';
import TransactionsShimmer from '../shimmers/TransactionsShimmer';
import Card from '../ui/Card';

type Props = {};

const LatestTransactions: FC<Props> = () => {
  const setLastFinalizedTransaction = useAppStore((state) => state.setLastFinalizedTransaction);
  const selectedEnvironment = useAppPersistStore((state) => state.selectedEnvironment);
  const [latestTransactions, setLatestTransactions] = useState<Array<DataAvailabilityTransactionUnion>>();
  const { sendJsonMessage, lastMessage, readyState } = useWebSocket(
    getConfig(selectedEnvironment.id).apiEndpoint.replace('http', 'ws'),
    { protocols: ['graphql-ws'] }
  );

  const onCompleted = (data: DaTransactionsQuery) => {
    const txns = data?.dataAvailabilityTransactions.items;
    setLastFinalizedTransaction(txns[0] as DataAvailabilityTransactionUnion);
    setLatestTransactions(txns as Array<DataAvailabilityTransactionUnion>);
  };

  const { loading } = useDaTransactionsQuery({
    variables: { request: { limit: 10 } },
    onCompleted
  });

  useEffect(() => {
    if (readyState === 1) {
      sendJsonMessage({
        id: '1',
        type: 'start',
        payload: {
          variables: {},
          extensions: {},
          operationName: 'NewTransaction',
          query:
            'subscription NewTransaction {\n  newDataAvailabilityTransaction {\n    ... on DataAvailabilityPost {\n      ...DAPostFields\n      __typename\n    }\n    ... on DataAvailabilityComment {\n      ...DACommentFields\n      __typename\n    }\n    ... on DataAvailabilityMirror {\n      ...DAMirrorFields\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment DAPostFields on DataAvailabilityPost {\n  transactionId\n  submitter\n  createdAt\n  appId\n  profile {\n    ...ProfileFields\n    __typename\n  }\n  publicationId\n  __typename\n}\n\nfragment ProfileFields on Profile {\n  id\n  name\n  handle\n  bio\n  ownedBy\n  isFollowedByMe\n  stats {\n    totalFollowers\n    totalFollowing\n    totalPosts\n    totalComments\n    totalMirrors\n    __typename\n  }\n  attributes {\n    key\n    value\n    __typename\n  }\n  picture {\n    ... on MediaSet {\n      original {\n        url\n        __typename\n      }\n      __typename\n    }\n    ... on NftImage {\n      uri\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment DACommentFields on DataAvailabilityComment {\n  transactionId\n  submitter\n  createdAt\n  appId\n  profile {\n    ...ProfileFields\n    __typename\n  }\n  publicationId\n  commentedOnProfile {\n    ...ProfileFields\n    __typename\n  }\n  commentedOnPublicationId\n  __typename\n}\n\nfragment DAMirrorFields on DataAvailabilityMirror {\n  transactionId\n  submitter\n  createdAt\n  appId\n  profile {\n    ...ProfileFields\n    __typename\n  }\n  publicationId\n  mirrorOfProfile {\n    ...ProfileFields\n    __typename\n  }\n  mirrorOfPublicationId\n  __typename\n}'
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyState]);

  useEffect(() => {
    const jsonData = JSON.parse(lastMessage?.data || '{}');
    const daData = jsonData?.payload?.data;
    console.log('🚀 ~ daData:', daData, lastMessage);

    if (daData) {
      const txn = daData?.newDataAvailabilityTransaction as DataAvailabilityTransactionUnion;
      setLastFinalizedTransaction({ ...txn });
      let oldTxns = [...(latestTransactions as DataAvailabilityTransactionUnion[])];
      oldTxns.unshift(txn);
      oldTxns.pop();
      setLatestTransactions(oldTxns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage]);

  return (
    <Card>
      <div className="left-0 right-0 flex items-center justify-between gap-y-3">
        <h1 className="text-sm font-medium opacity-90">Latest Transactions</h1>
        <Link
          href="/txns"
          className="flex items-center space-x-2 text-sm opacity-90 hover:text-[#3D794E] hover:opacity-100 dark:hover:text-[#D0DBFF]"
        >
          <span>View all</span>
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        {loading && <TransactionsShimmer />}
        <table className="min-w-full table-auto border-separate border-spacing-y-3">
          <tbody>
            {latestTransactions?.map((txn, i) => (
              <tr key={i} className="overflow-hidden bg-white dark:bg-[#16161B]">
                <td className="w-48 whitespace-nowrap rounded-l-xl px-3 py-4 text-sm text-[#16161B]">
                  <div className="flex items-center space-x-2">
                    <span className="rounded-xl bg-gray-100 p-2 dark:bg-[#1C1B22]">
                      <ArrowsRightLeftIcon className="h-4 w-4 text-[#3D794E] dark:text-[#D0DBFF]" />
                    </span>
                    <div className="flex flex-col">
                      <Link
                        href={`/tx/${txn.transactionId}`}
                        className="text-[#3D794E] opacity-80 hover:opacity-100 dark:text-[#D0DBFF]"
                      >
                        {txn.transactionId}
                      </Link>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {getRelativeTime(txn.createdAt)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-center text-sm text-[#23222A] dark:text-gray-300">
                  <span className="inline-flex w-20 items-center justify-center space-x-1 rounded-lg border bg-gray-50 px-3 py-1.5 text-xs dark:border-[#16161B] dark:bg-[#1C1B22]">
                    {getDAActionType(txn.__typename)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="flex flex-col">
                    <span className="inline-flex items-center space-x-2 px-2 py-0.5 text-sm leading-3">
                      <span className="text-xs opacity-70">From</span>
                      <span className="inline-flex items-center space-x-1">
                        <img
                          className="h-3 w-3 flex-none rounded-2xl"
                          src={getProfilePicture(txn.profile as Profile)}
                          alt="pfp"
                          draggable={false}
                        />
                        <Link
                          href={`/profile/${txn.profile.id}`}
                          className="text-[#3D794E] opacity-80 hover:opacity-100 dark:text-[#D0DBFF]"
                        >
                          {txn.profile.handle}
                        </Link>
                      </span>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 text-sm">
                      <span className="text-xs opacity-70">via</span>
                      <Link
                        href="/submitters"
                        className="text-[#3D794E] opacity-80 hover:opacity-100 dark:text-[#D0DBFF]"
                      >
                        {txn.submitter}
                      </Link>
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <Link
                    href={`/tx/${txn.transactionId}`}
                    className="text-sm opacity-70 hover:text-[#3D794E] hover:opacity-100 hover:dark:text-[#D0DBFF]"
                  >
                    View
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <Favorite
                    dataAvailabilityTransaction={txn}
                    renderItem={(isFavorite) =>
                      isFavorite ? (
                        <StarIconSolid className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <StarIcon className="h-4 w-4 text-yellow-500" />
                      )
                    }
                  />
                </td>
                <td className="rounded-r-xl px-3 py-4">
                  <Link
                    className="flex flex-none justify-center opacity-70 hover:opacity-100"
                    href={`${getLensterLink(selectedEnvironment.id)}/posts/${txn.publicationId}`}
                    target="_blank"
                  >
                    <img
                      src={`https://static-assets.lenster.xyz/images/source/lenster.jpeg`}
                      className="h-5 w-5 rounded-full"
                      alt="lenster"
                      draggable={false}
                    />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default LatestTransactions;
